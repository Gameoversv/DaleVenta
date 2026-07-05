package rd.dalventa.api.product.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.product.domain.Category;
import rd.dalventa.api.product.dto.CategoryResponse;
import rd.dalventa.api.product.dto.CreateCategoryRequest;
import rd.dalventa.api.product.repository.CategoryRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional
    public CategoryResponse create(CreateCategoryRequest req) {
        var category = new Category(req.name());
        category.setTenantId(TenantContext.require());
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return categoryRepository.findAllByTenantIdAndActiveTrue(TenantContext.require())
                .stream().map(CategoryResponse::from).toList();
    }
}
